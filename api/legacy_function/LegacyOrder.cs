using System;
using System.Collections.Generic;
using System.Net;
using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;
using Newtonsoft.Json;
using OrderModule;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(
typeof(Amazon.Lambda.Serialization.Json.JsonSerializer))]

namespace OrderModule
{
    public class LegacyOrder
    {
        ITimeProcessor processor = new TimeProcessor();

        public APIGatewayProxyResponse FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
        {
            var result = processor.CurrentTimeUTC();
            Console.WriteLine("------------------ Inside C# lambda -----------------------");
            Console.WriteLine("request =" + request);
            Console.WriteLine("result= " + result);
            
            return CreateResponse(result);
        }

        APIGatewayProxyResponse CreateResponse(DateTime? result)
        {
            int statusCode = (result != null) ?
                (int)HttpStatusCode.OK :
                (int)HttpStatusCode.InternalServerError;

            string body = (result != null) ?
                JsonConvert.SerializeObject(result) : string.Empty;

            var response = new APIGatewayProxyResponse
            {
                StatusCode = statusCode,
                Body = body,
                Headers = new Dictionary<string, string>
        {
            { "Content-Type", "application/json" },
            { "Access-Control-Allow-Origin", "*" },
            { "Access-Control-Allow-Headers", "*" },
            { "Access-Control-Allow-Methods", "OPTIONS,POST" }
        }
            };

            return response;
        }
    }
}