using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Foundation.Metadata;

/// <summary>
/// 
/// </summary>
namespace Sage.X3.Mobile.NativeComponents.Basics
{
    /// <summary>
    /// Class to allow logging
    /// </summary>
    [AllowForWeb]
    public sealed class NativeLogger
    {
        public void Log(string msg)
        {
            System.Diagnostics.Debug.WriteLine(msg);
        }
    }
}
