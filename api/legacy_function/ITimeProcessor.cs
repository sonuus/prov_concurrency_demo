using System;
using OrderModule;
namespace OrderModule
{
    public interface ITimeProcessor
    {
        DateTime CurrentTimeUTC();
    }
}