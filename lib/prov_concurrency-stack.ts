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
import * as autoscalling from '@aws-cdk/aws-autoscaling'

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
        timeout: cdk.Duration.seconds(29)
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

    const httpApi = new HttpApi(this, 'http-order-api', {
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
          "QUEUE_URL": my_queue.queueUrl,
        },
        timeout: cdk.Duration.seconds(29)
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
      methods: [HttpMethod.POST],
      integration: new LambdaProxyIntegration({
        handler: newOrderFunction,
      }),
    });

    const newOrderFunctionAlias = new lambda.Alias(this,'newOrderFunctionAlias',{
      aliasName:'live',
      provisionedConcurrentExecutions: 2,
      version: newOrderFunction.currentVersion 
    })

    const autoScalling = newOrderFunctionAlias.addAutoScaling({
      minCapacity: 2,
      maxCapacity:7
    })

    autoScalling.scaleOnUtilization({
      utilizationTarget:0.2
    })


    const table2 = new dynamodb.Table(this, `provisionedTable`, {
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.NUMBER },
      pointInTimeRecovery: false,
    });



    // Order process function
    const orderProcessFunction = new lambda.Function(this, 'orderProcessFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'app.handler',
      timeout: cdk.Duration.seconds(10),
      code: lambda.Code.fromAsset(path.join(__dirname, '../backend/process_function')),
      environment: {
        "DYNAMODB_TABLE": table2.tableName,
        "QUEUE_URL": my_queue.queueUrl,
      },
      reservedConcurrentExecutions: 1
    });

    orderProcessFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions:[ "sqs:DeleteMessage"],
        resources: [my_queue.queueArn],
      })
    );
    table2.grantWriteData(orderProcessFunction)

    orderProcessFunction.addEventSource(new SqsEventSource(my_queue,{
      batchSize:2,
      maxBatchingWindow: cdk.Duration.seconds(5),
    }))  

  }
}
