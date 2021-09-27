using System;
using System.Threading;

namespace LegacyOrderPost
{
    public class TimeProcessor : ITimeProcessor
    {
        public DateTime CurrentTimeUTC()
        {
            Thread.Sleep(3000);
            return DateTime.UtcNow;
        }
    }
} 