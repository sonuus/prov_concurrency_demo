import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as sqs from "@aws-cdk/aws-sqs";
import {
  SqsEventSource,
  SqsEventSourceProps,
} from "@aws-cdk/aws-lambda-event-sources";
import * as apigateway from "@aws-cdk/aws-apigateway";
import {CorsHttpMethod, HttpApi, HttpMethod, HttpRouteIntegrationConfig} from '@aws-cdk/aws-apigatewayv2';
import {LambdaProxyIntegration} from '@aws-cdk/aws-apigatewayv2-integrations';

import * as path from "path";

export class ProvConcurrencyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, id, {
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.NUMBER },
      pointInTimeRecovery: false,
    });

    const api = new apigateway.RestApi(this, "api", {
      description: "Food orders api gateway",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
        ],
        allowMethods: ["OPTIONS", "GET", "POST"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    // The code that defines your stack goes here test

    const legacyorderFunction = new lambda.DockerImageFunction(
      this,
      "legacyFunction",
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, "../api/LegacyOrderPost/src/LegacyOrderPost")
        ),
        environment: {
          DYNAMODB_TABLE: table.tableName,
        },
      }
    );
    legacyorderFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:DescribeTable"],
        resources: [table.tableArn],
      })
    );
    table.grantWriteData(legacyorderFunction);

    const orderAPIResource = api.root.addResource("Orders");

    orderAPIResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(legacyorderFunction, { proxy: true })
    );
    
    //// New API
    const my_queue = new sqs.Queue(this,'foodOrderQueue',{
      visibilityTimeout: cdk.Duration.seconds(20)
    })

    const httpApi = new HttpApi(this, 'http-api-example', {
      description: 'HTTP API to process orders',
      corsPreflight: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: [
          CorsHttpMethod.OPTIONS,
          CorsHttpMethod.GET,
          CorsHttpMethod.POST        
        ],
        allowCredentials: true,
        allowOrigins: ['*'],
      },
    });

    const newOrderFunction = new lambda.DockerImageFunction(
      this,
      "newOrderFunction",
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, "../api/NewOrderPost/src/NewOrderPost")
        ),
        environment: {
          "QUEUE_NAME": my_queue.queueName,
        },
      }
    );

    newOrderFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions:[ "sqs:SendMessage"],
        resources: [my_queue.queueArn],
      })
    );


    httpApi.addRoutes({
      path: '/Orders2',
      methods: [HttpMethod.GET],
      integration: new LambdaProxyIntegration({
        handler: newOrderFunction,
      }),
    });



    // Order process function
    const orderProcessFunction = new lambda.Function(this, 'orderProcessFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'app.hander',
      timeout: cdk.Duration.seconds(10),
      code: lambda.Code.fromAsset(path.join(__dirname, '../backend/process_function')),
    });

    orderProcessFunction.addEventSource(new SqsEventSource(my_queue,{
      batchSize:2,
      maxBatchingWindow: cdk.Duration.seconds(5),
    }))  

  }
}
