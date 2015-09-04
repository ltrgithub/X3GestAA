using Sage.X3.Mobile.App.Pages;
using Sage.X3.Mobile.App.Pages.ServerConfig;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Data.Xml.Dom;
using Windows.Foundation.Metadata;
using Windows.UI.Notifications;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Sage.X3.Mobile.App.Common.JSInterface
{
    /// <summary>
    /// Class to directly allow interaction with the wrapper and internal webapp
    /// </summary>
    public class SageX3WUPAppJSInterface: Sage.X3.Mobile.NativeComponents.Basics.INativeSageX3WUPApp
    {
        private WebViewPage page;
        public SageX3WUPAppJSInterface(WebViewPage page)
        {
            this.page = page;
        }

        // Called when webapp wants to switch to another server
        public void ConfigServer()
        {
            Frame rootFrame = Window.Current.Content as Frame;
            rootFrame.Navigate(typeof(SelectServerPage));
        }

        /// <summary>
        /// Called when webapp is fully loaded
        /// </summary>
        public void NotifLoaded()
        {
            this.page.NotifLoaded();
        }

        /// <summary>
        /// Called when webapp encounters problems starting up
        /// </summary>
        /// <param name="msg"></param>
        public void NotifStartFail(string msg)
        {
            this.page.NotifStartFail(msg);
        }
    }
}
