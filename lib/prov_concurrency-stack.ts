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
import * as apigateway2 from "@aws-cdk/aws-apigatewayv2";
import * as path from "path";


export class ProvConcurrencyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    const table = new dynamodb.Table(this, id, {
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING},
      sortKey: {name: 'createdAt', type: dynamodb.AttributeType.NUMBER},
      pointInTimeRecovery: false,
    });



    // The code that defines your stack goes here test

    const legacyorderFunction = new lambda.DockerImageFunction(
      this,
      "legacyFunction",
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, "../api/LegacyOrderPost/src/LegacyOrderPost")
        ),
        environment:{
          "DYNAMODB_TABLE" :  table.tableName
        }
      }
    );

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

    const orderAPIResource = api.root.addResource("Orders");

    orderAPIResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(legacyorderFunction, { proxy: true })
    );

  }
}
