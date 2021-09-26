import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam'
import * as dynamodb from '@aws-cdk/aws-dynamodb'
import * as lambda from '@aws-cdk/aws-lambda'
import * as sqs from '@aws-cdk/aws-sqs'
import {SqsEventSource,SqsEventSourceProps} from '@aws-cdk/aws-lambda-event-sources'
import * as apigateway from '@aws-cdk/aws-apigateway'
import * as apigateway2 from '@aws-cdk/aws-apigatewayv2'
import * as path from "path";

export class ProvConcurrencyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here test

    new lambda.DockerImageFunction(this, "legacyFunction", {
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, "../api/legacy_function")),
    });
  }
}
