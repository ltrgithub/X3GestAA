using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The Blank Page item template is documented at http://go.microsoft.com/fwlink/?LinkId=402352&clcid=0x409
namespace SageX3WUP.App.Pages
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class WebViewPage : Page
    {
        public WebViewPage()
        {
            this.InitializeComponent();

            // Be careful, these will be triggered also by webview internal navigation events triggered by webapp
            this.webView.NavigationStarting += WebView_NavigationStarting;
            this.webView.NavigationCompleted += WebView_NavigationCompleted;
            this.webView.NavigationFailed += WebView_NavigationFailed;

            this.addNativeLibraries();

            this.Loaded += MainPage_Loaded;
        }

        private void addNativeLibraries()
        {
            // used to allow interaction with this container app
            this.webView.AddWebAllowedObject("smNativeApp", new SageX3WUP.NativeAddons.NativeSageX3WUPAppWrapper(new SageX3WUPAppJSInterface(this)));

            // redirect debug output
            this.webView.AddWebAllowedObject("smNativeLogger", new SageX3WUP.NativeAddons.NativeLogger());
        }

        private void WebView_NavigationStarting(WebView sender, WebViewNavigationStartingEventArgs args)
        {
        }

        private void WebView_NavigationCompleted(WebView sender, WebViewNavigationCompletedEventArgs args)
        {
        }

        private void WebView_NavigationFailed(object sender, WebViewNavigationFailedEventArgs e)
        {
        }


        private void MainPage_Loaded(object sender, RoutedEventArgs e)
        {
        }

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            string server = e.Parameter.ToString();
            try {
                SageX3WUP.App.Model.Server match = SageX3WUP.App.Model.Servers.GetKnownServers().List.SingleOrDefault(s => s.Id == server);
                if (match != null)
                {
                    this.showLoadingMessage();
                    this.webView.Navigate(new Uri(match.Url));
                }
                else
                {
                    throw new Exception("Unable to find matching server configuration");
                }
            } catch (Exception)
            {
                // TODO:
            }
        }

        public void showLoadingMessage()
        {
            this.panelLoading.Visibility = Visibility.Visible;
            this.webView.Visibility = Visibility.Collapsed;
        }
        public void hideLoadingMessage()
        {
            this.panelLoading.Visibility = Visibility.Collapsed;
            this.webView.Visibility = Visibility.Visible;
        }
    }
}
