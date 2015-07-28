using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Foundation.Metadata;

namespace SageX3WUP.NativeAddons
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
