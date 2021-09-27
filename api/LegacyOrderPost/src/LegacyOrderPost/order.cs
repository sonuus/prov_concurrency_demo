using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Amazon.DynamoDBv2.DataModel;

namespace LegacyOrderPost
{
    public class FoodOrder
    {
        [DynamoDBHashKey]
        public string Id { get; set; }
        public string Name { get; set; }
        public string Quantity { get; set; }
        public DateTime CreatedTimestamp { get; set; }
    }
}