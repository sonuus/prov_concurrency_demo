using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LegacyOrderPost
{
    public class FoodOrder
    {
        
        public string id { get; set; }
        public string Name { get; set; }
        public string Quantity { get; set; }
        public long createdAt { get; set; }
        public string RandomData { get; set; }
    }
}