# === FILE: worker/worker.py ===
import os
import sys
import json
import time
import signal
import logging
import datetime
from pymongo import MongoClient
from bson.objectid import ObjectId
import redis

# Configure strictly formatted logging to stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/ai_tasks')
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')

shutdown_requested = False

def handle_sigterm(*args):
    global shutdown_requested
    logger.info("Termination signal received. Shutting down gracefully after current job...")
    shutdown_requested = True

signal.signal(signal.SIGINT, handle_sigterm)
signal.signal(signal.SIGTERM, handle_sigterm)

def perform_operation(operation, text):
    """Executes the core text operations dictated by the assignment."""
    if operation == 'uppercase':
        return text.upper()
    elif operation == 'lowercase':
        return text.lower()
    elif operation == 'reverse':
        return text[::-1]
    elif operation == 'word_count':
        words = text.split()
        return {
            'word_count': len(words),
            'character_count': len(text),
            'sentence_count': text.count('.') + text.count('!') + text.count('?'),
            'unique_words': len(set(word.lower() for word in words))
        }
    raise ValueError(f"Unknown operation: {operation}")

def append_log(tasks_collection, task_id, level, message):
    """Appends sequential logs strictly into Mongo array for SSE streaming."""
    log_entry = {
        'timestamp': datetime.datetime.utcnow(),
        'level': level,
        'message': message
    }
    tasks_collection.update_one(
        {'_id': task_id},
        {'$push': {'logs': log_entry}}
    )
    logger.info(f"[Task {task_id}] {level}: {message}")

def process_job(job, tasks_collection, worker_pid):
    """Robust core processing loop guaranteeing state atomicity."""
    task_id = job.get('taskId')
    operation = job.get('operation')
    input_text = job.get('input', '')

    try:
        obj_id = ObjectId(task_id)
    except Exception as e:
        logger.error(f"Invalid taskId format: {task_id}")
        return

    # Atomic transition from pending -> running 
    # to protect against duplicate processing scenarios if Redis queue had an issue
    result = tasks_collection.update_one(
        {'_id': obj_id, 'status': 'pending'},
        {
            '$set': {'status': 'running', 'workerPid': str(worker_pid)}
        }
    )
    
    if result.modified_count == 0:
        logger.warning(f"Task {task_id} not in pending state. Skipping.")
        return

    append_log(tasks_collection, obj_id, 'INFO', f'Worker {worker_pid} picked up task via high-performance queue')

    try:
        time.sleep(2) # Artificial sleep to visually demonstrate running status in UI
        append_log(tasks_collection, obj_id, 'INFO', f'Executing core operation: {operation}')
        
        output = perform_operation(operation, input_text)
        
        # Atomic transition to success
        tasks_collection.update_one(
            {'_id': obj_id},
            {
                '$set': {
                    'status': 'success',
                    'result': output
                }
            }
        )
        append_log(tasks_collection, obj_id, 'INFO', 'Task execution completed successfully')
    except Exception as e:
        logger.error(f"Error processing task {task_id}: {str(e)}")
        # Atomic transition to failed
        tasks_collection.update_one(
            {'_id': obj_id},
            {
                '$set': {
                    'status': 'failed',
                    'result': str(e)
                }
            }
        )
        append_log(tasks_collection, obj_id, 'ERROR', f'Task failed: {str(e)}')

def process_fallback_job(pending_task, tasks_collection, worker_pid):
    """Processes jobs acquired via polling when Redis is unavailable."""
    obj_id = pending_task['_id']
    operation = pending_task['operation']
    input_text = pending_task['input']
    
    append_log(tasks_collection, obj_id, 'WARN', f'Worker {worker_pid} acquired task via fallback MongoDB poll due to queue failure')

    try:
        time.sleep(2)
        append_log(tasks_collection, obj_id, 'INFO', f'Executing core operation: {operation}')
        output = perform_operation(operation, input_text)
        tasks_collection.update_one(
            {'_id': obj_id},
            {'$set': {'status': 'success', 'result': output}}
        )
        append_log(tasks_collection, obj_id, 'INFO', 'Task execution completed successfully')
    except Exception as e:
        tasks_collection.update_one(
            {'_id': obj_id},
            {'$set': {'status': 'failed', 'result': str(e)}}
        )
        append_log(tasks_collection, obj_id, 'ERROR', f'Task failed: {str(e)}')

def main():
    global shutdown_requested
    worker_pid = os.getpid()
    logger.info(f"Starting python background worker. PID: {worker_pid}")

    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = mongo_client.get_default_database()
    tasks_collection = db['tasks']
    
    redis_client = None

    while not shutdown_requested:
        # 1. Automatic Redis connection retry block
        if not redis_client:
            try:
                redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
                redis_client.ping()
                logger.info("Connected to Redis queue. BLPOP mode active.")
            except redis.ConnectionError:
                redis_client = None
                logger.warning("Redis connection failed. Engaging graceful fallback to MongoDB polling.")

        # 2. Primary Fast-Path Execution loop
        if redis_client:
            try:
                # BLPOP immediately grabs job if present, otherwise sleeps for up to 5s without CPU overhead
                result = redis_client.blpop("ai_task_queue", timeout=5)
                if result:
                    _, payload = result
                    job = json.loads(payload)
                    process_job(job, tasks_collection, worker_pid)
            except redis.ConnectionError:
                logger.error("Lost Redis connection during processing.")
                redis_client = None
            except Exception as e:
                logger.error(f"Unexpected Redis error: {e}")
                time.sleep(1)
                
        # 3. Fallback Slow-Path Execution loop (MongoDB Polling)
        else:
            try:
                pending_task = tasks_collection.find_one_and_update(
                    {'status': 'pending'},
                    {'$set': {'status': 'running', 'workerPid': str(worker_pid)}},
                    sort=[('createdAt', 1)]
                )
                if pending_task:
                    process_fallback_job(pending_task, tasks_collection, worker_pid)
                else:
                    time.sleep(5)
            except Exception as e:
                logger.error(f"MongoDB polling failure: {e}")
                time.sleep(5)

    logger.info("Worker stopped securely.")
    mongo_client.close()
    if redis_client:
        redis_client.close()

if __name__ == '__main__':
    main()
