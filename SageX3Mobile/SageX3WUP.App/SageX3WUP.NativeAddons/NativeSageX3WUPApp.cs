using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Foundation.Metadata;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace SageX3WUP.NativeAddons
{
    public interface INativeSageX3WUPApp
    {
        void ConfigServer();
        void NotifLoaded();
        void NotifStartFail(string msg);
    }

    /// <summary>
    /// Class to directly allow interaction with the wrapper and internal webapp
    /// This is a wrapper class with no external dependencies so it can be shared with the webview
    /// It only delegates all calls to the interface given on construction
    /// </summary>
    [AllowForWeb]
    public sealed class NativeSageX3WUPAppWrapper : INativeSageX3WUPApp
    {
        private INativeSageX3WUPApp impl;

        public NativeSageX3WUPAppWrapper(INativeSageX3WUPApp impl)
        {
            this.impl = impl;
        }

        public void ConfigServer()
        {
            this.impl.ConfigServer();
        }

        public void NotifLoaded()
        {
            this.impl.NotifLoaded();
        }

        public void NotifStartFail(string msg)
        {
            this.impl.NotifStartFail(msg);
        }
    }
}
