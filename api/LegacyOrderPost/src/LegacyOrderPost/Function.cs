using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Amazon.Lambda.APIGatewayEvents;
using Newtonsoft.Json;
using Amazon.Lambda.Core;
using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;


// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(
typeof(Amazon.Lambda.Serialization.Json.JsonSerializer))]

namespace LegacyOrderPost
{
    public class Function
    {   
        IDynamoDBContext DDBContext { get; set; }        
        APIGatewayProxyResponse CreateResponse(string result)
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

        public APIGatewayProxyResponse FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
        {
            ITimeProcessor processor = new TimeProcessor();
            //Initialize DynamoDb client
            var config = new DynamoDBContextConfig { Conversion = DynamoDBEntryConversion.V2 };
            this.DDBContext = new DynamoDBContext(new AmazonDynamoDBClient(), config);
            var tableName = System.Environment.GetEnvironmentVariable();
            if(!string.IsNullOrEmpty(tableName))
            {
                AWSConfigsDynamoDB.Context.TypeMappings[typeof(FoodOrder)] = new Amazon.Util.TypeMapping(typeof(FoodOrder));
            }
            var result = processor.CurrentTimeUTC();
            Console.WriteLine("------------------ Inside C# lambda -----------------------");
            Console.WriteLine("request =" + request);

            return CreateResponse( await AddFoodOrderAsync(request, context));
        }

        public async Task<APIGatewayProxyResponse> AddFoodOrderAsync(APIGatewayProxyRequest request, ILambdaContext context)
        {
            var Order = JsonConvert.DeserializeObject<FoodOrder>(request?.Body);
            Order.Id = Guid.NewGuid().ToString();
            Order.CreatedTimestamp = DateTime.Now;
            context.Logger.LogLine($"Saving Food Order with id {Order.Id}");
            await DDBContext.SaveAsync<FoodOrder>(Order);   
            context.Logger.LogLine($"Food Order saved in Dynamo Db {Order.Id}");        
            return Order.Id.ToString();
        }


    }
}
