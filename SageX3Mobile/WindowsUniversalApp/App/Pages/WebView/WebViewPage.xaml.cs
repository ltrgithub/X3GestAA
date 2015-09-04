using Sage.X3.Mobile.App.Common;
using Sage.X3.Mobile.App.Common.JSInterface;
using Sage.X3.Mobile.App.Model;
using Sage.X3.Mobile.App.Pages.ServerConfig;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Threading.Tasks;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Core;
using Windows.UI.Popups;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The Blank Page item template is documented at http://go.microsoft.com/fwlink/?LinkId=402352&clcid=0x409
namespace Sage.X3.Mobile.App.Pages
{
    enum WebviewLoadingState
    {
        TRIGGERED,
        STARTED,
        FAILED,
        COMPLETED,
        ACKNOWLEDGED
    }

    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class WebViewPage : Page
    {
        private WebviewLoadingState loadingState = WebviewLoadingState.ACKNOWLEDGED;
        private Server server;

        /// <summary>
        /// 
        /// </summary>
        public WebViewPage()
        {
            this.InitializeComponent();

            // Be careful, these will be triggered also by webview internal navigation events triggered by webapp
            this.webView.NavigationStarting += WebView_NavigationStarting;
            this.webView.NavigationCompleted += WebView_NavigationCompleted;
            this.webView.NavigationFailed += WebView_NavigationFailed;
            this.addNativeLibraries();
        }

        /// <summary>
        /// 
        /// </summary>
        private void addNativeLibraries()
        {
            // used to allow interaction with this container app
            this.webView.AddWebAllowedObject("smNativeApp", new Sage.X3.Mobile.NativeComponents.Basics.NativeSageX3WUPAppWrapper(new SageX3WUPAppJSInterface(this)));

            // redirect debug output
            this.webView.AddWebAllowedObject("smNativeLogger", new Sage.X3.Mobile.NativeComponents.Basics.NativeLogger());

            // redirect debug output
            this.webView.AddWebAllowedObject("smNativeMsg", new Sage.X3.Mobile.NativeComponents.Basics.NativeMessages());

        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="args"></param>
        private void WebView_NavigationStarting(WebView sender, WebViewNavigationStartingEventArgs args)
        {
            if (this.loadingState == WebviewLoadingState.TRIGGERED) // Triggered from native app, not navigation by js/html
            {
                this.loadingState = WebviewLoadingState.STARTED;
            }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="args"></param>
        private void WebView_NavigationCompleted(WebView sender, WebViewNavigationCompletedEventArgs args)
        {
            if (!args.IsSuccess)
            {
                // Catched by NavigationFailed
                return;
            }

            if (loadingState == WebviewLoadingState.STARTED)
            {
                this.loadingState = WebviewLoadingState.COMPLETED;

                // If the content of the webview is loaded, JS should call this.NotifLoaded to signal all is fine
                // if this call is not done withing a periode of time, we assume there is s.th. wrong.
                // This can be a scripterror 
                Task.Delay(30000).ContinueWith(i => this.Dispatcher.RunAsync(CoreDispatcherPriority.Normal, this.checkLoadedNotification));

                // Debugging show after 5 seconds
                //Task.Delay(5000).ContinueWith(i => this.Dispatcher.RunAsync(CoreDispatcherPriority.Normal, this.hideLoadingMessage));
            }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void WebView_NavigationFailed(object sender, WebViewNavigationFailedEventArgs e)
        {
            this.loadingState = WebviewLoadingState.FAILED;
            this.showLoadingError("There was an error loading the application: " + e.WebErrorStatus + "\nPlease select another server configuration");
        }

        /// <summary>
        /// 
        /// </summary>
        private void checkLoadedNotification()
        {
            if (this.loadingState != WebviewLoadingState.ACKNOWLEDGED)
            {
                this.loadingState = WebviewLoadingState.FAILED;
                this.showLoadingError("There was an error loading the application: The application did not respond in time." + "\nPlease select another server configuration");
            }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="msg"></param>
        private async void showLoadingError(string msg)
        {
            await UIHelpers.ShowModal(msg, "Error loading application");
            this.hideLoadingMessage();
            Frame rootFrame = Window.Current.Content as Frame;
            rootFrame.Navigate(typeof(SelectServerPage));
        }


        /// <summary>
        /// 
        /// </summary>
        /// <param name="command"></param>
        private void CommandInvokedHandler(IUICommand command)
        {
            Frame rootFrame = Window.Current.Content as Frame;
            if ("LOAD_ERROR_OK" == (string)command.Id)
            {
                rootFrame.Navigate(typeof(SelectServerPage));
            }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="e"></param>
        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            string serverId = e.Parameter.ToString();
            try {
                Model.Server srv = Model.Servers.GetKnownServers().GetServerById(serverId);
                if (srv != null)
                {
                    this.server = srv;
                    this.loadingState = WebviewLoadingState.TRIGGERED;
                    this.showLoadingMessage();
                    this.webView.Navigate(srv.GetStartUrl());
                }
                else
                {
                    throw new Exception("Unable to find matching server configuration");
                }
            } catch (Exception ex)
            {
                this.hideLoadingMessage();
                this.showLoadingError(ex.Message);
            }
        }

        /// <summary>
        /// 
        /// </summary>
        public void showLoadingMessage()
        {
            this.textBlockName.Text = server.Name;
            this.panelLoading.Visibility = Visibility.Visible;
            this.webView.Visibility = Visibility.Collapsed;
        }

        /// <summary>
        /// 
        /// </summary>
        public void hideLoadingMessage()
        {
            this.panelLoading.Visibility = Visibility.Collapsed;
            this.webView.Visibility = Visibility.Visible;
        }

        /// <summary>
        /// Called by JS inside webview
        /// </summary>
        public void NotifLoaded()
        {
            loadingState = WebviewLoadingState.ACKNOWLEDGED;
            this.Dispatcher.RunAsync(CoreDispatcherPriority.Normal, () => this.hideLoadingMessage()).AsTask();
        }

        /// <summary>
        /// Called by JS inside webview
        /// </summary>
        /// <param name="msg"></param>
        public void NotifStartFail(string msg)
        {
            loadingState = WebviewLoadingState.FAILED;
            this.Dispatcher.RunAsync(CoreDispatcherPriority.Normal, () => this.showLoadingError(msg)).AsTask();
        }

        private void Page_SizeChanged(object sender, SizeChangedEventArgs e)
        {
             ApplicationViewOrientation o = ApplicationView.GetForCurrentView().Orientation;
            if (o == ApplicationViewOrientation.Landscape)
            {
                VisualStateManager.GoToState(this, "Landscape", true);
            } else
            {
                VisualStateManager.GoToState(this, "Portrait", true);
            }
        }
    }
}
