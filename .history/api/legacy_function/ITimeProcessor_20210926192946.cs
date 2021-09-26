using System;

namespace OrderModule
{
    public interface ITimeProcessor
    {
        DateTime CurrentTimeUTC();
    }
}