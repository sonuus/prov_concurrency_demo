using System;
namespace LegacyOrderPost
{
    public class TimeProcessor : ITimeProcessor
    {
        public DateTime CurrentTimeUTC()
        {
            return DateTime.UtcNow;
        }
    }
} 