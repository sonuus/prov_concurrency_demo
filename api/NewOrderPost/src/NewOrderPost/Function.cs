using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Amazon.Lambda.APIGatewayEvents;
using Newtonsoft.Json;
using Amazon.Lambda.Core;
using Amazon.SQS;
using System.Text;


// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(
typeof(Amazon.Lambda.Serialization.Json.JsonSerializer))]

namespace LegacyOrderPost
{
    public class Function
    {   
        
        ITimeProcessor processor = new TimeProcessor();
        AmazonSQSClient sqs = new AmazonSQSClient();
        // DateTime result = processor.CurrentTimeUTC();
        private string queueURL = System.Environment.GetEnvironmentVariable("QUEUE_URL");
        
        public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
        {
            Console.WriteLine("------Start ------------ FunctionHandler -----------------------");
            Console.WriteLine("request =" + request);           
            string sqsResponse = await AddFoodOrderAsync(request, context) ;            
            return CreateResponse(sqsResponse);
            
            
        }

        public async Task<string> AddFoodOrderAsync(APIGatewayProxyRequest request, ILambdaContext context)
        {      
            Console.WriteLine("------Start ------------ AddFoodOrderAsync -----------------------");
            try{
                string messageBodyBase64 = request?.Body;
                byte[] data = Convert.FromBase64String(messageBodyBase64);
                string decodedString = Encoding.UTF8.GetString(data);
                Console.WriteLine("request =" + decodedString);
                await sqs.SendMessageAsync(queueURL, decodedString);
            
            Console.WriteLine("------End ------------ AddFoodOrderAsync -----------------------");
            }catch(Exception e){
                Console.WriteLine(e);
                return "";
            }
            return "Success";
        }
        
        string GetStringBlob(){
            string s ="he FDA establishes advisory committees to assist the federal agency with one of its most important duties: deciding whether to approve the distribution of new drugs. The stakes of these decisions are enormous. Based on the outcome of the FDA's deliberations, patients may gain access to lifesaving medicines, and manufacturers may reap billions in profits. Kesselheim, a professor at Harvard Medical School, was one of the members of this committee because of his expertise on pharmaceuticals that address diseases of the brain, including Alzheimer's, the irreversible, progressive brain disorder that destroys memory and thinking skills, and eventually causes death. Alzheimer's is the sixth leading cause of death in the United States." +
                       "Alzheimer's Disease Fast Facts" + "The public meeting, conducted as an all-day video call on November 6, 2020, concerned the application for aducanumab, a drug that would be marketed under the name Aduhelm by the company Biogen, which is based in Cambridge, Massachusetts. Aduhelm, if effective, would address one of the most pressing needs in modern medicine: to slow the symptoms of Alzheimer's disease. Research into Alzheimer's treatments has long been an exercise in frustration, with no new drugs approved since 2003. The field of Alzheimer's research had proved so difficult that it was dubbed by some with the macabre nickname of the " +
                       "In light of this record, and the need to improve it, Kesselheim was looking forward to examining the prospects for Biogen's new drug. The great thing about advisory committees is that they are independent, and they don't have a stake in the outcome,We were just an independent group providing their opinion." ;
           return s;
        }
        
        APIGatewayProxyResponse CreateResponse(string result)
        {
            Console.WriteLine("------Start ------------ CreateResponse -----------------------");
            
            int statusCode = (result != null) ?
                (int)HttpStatusCode.OK :
                (int)HttpStatusCode.InternalServerError;

            // string body = (result != null) ?
            //     JsonConvert.SerializeObject(result) : string.Empty;

            var response = new APIGatewayProxyResponse
            {
                StatusCode = statusCode,
                Body = result,
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
