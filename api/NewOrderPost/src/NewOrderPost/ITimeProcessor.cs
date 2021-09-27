using System;
namespace LegacyOrderPost
{
    public interface ITimeProcessor
    {
        DateTime CurrentTimeUTC();
    }
}