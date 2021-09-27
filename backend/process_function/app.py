import boto3
import os 
dynamodb_client = boto3.client("dynamodb")
sqs_client = boto3.client("sqs")


queue_url = os.environ("QUEUE_URL")
dynamodb_table = os.environ("DYNAMODB_TABLE")
table = dynamodb_client.Table(dynamodb_table)


def handler(event, context):
    for record in event['Records']:
        print(record)
        payload = record["body"]

        response = table.put_item(
            Item=payload            
        )
        print(f'DynamoDB insert response {response}')

        response = sqs_client.delete_message(
            QueueUrl=queue_url,
            ReceiptHandle= record["receipt_handle"] 
        )

        print(f'SQS delete response {response}')

        