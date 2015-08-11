using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Threading.Tasks;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The Blank Page item template is documented at http://go.microsoft.com/fwlink/?LinkId=234238

namespace SageX3WUP.App.Pages
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class SelectServerPage : Page
    {
        public static readonly DependencyProperty GridViewItemWidthProperty = DependencyProperty.Register("GridViewItemWidth", typeof(double), typeof(GridView), new PropertyMetadata(300, new PropertyChangedCallback(OnGridViewItemWidthChanged)));

        /// <summary>
        /// 
        /// </summary>
        /// <param name="d"></param>
        /// <param name="e"></param>
        private static void OnGridViewItemWidthChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
        }

        /// <summary>
        /// 
        /// </summary>
        public SelectServerPage()
        {
            this.InitializeComponent();
            this.Loaded += SelectServerPage_Loaded;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void SelectServerPage_Loaded(object sender, RoutedEventArgs e)
        {
            this.gridViewServers.ItemsSource = SageX3WUP.App.Model.Servers.GetKnownServers().List;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void gridViewServers_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {

        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void gridViewServers_SizeChanged(object sender, SizeChangedEventArgs e)
        {
            int numCols = (int) this.gridViewServers.ActualWidth / 200;
            numCols = Math.Max(1, numCols);

            double colWidth = this.gridViewServers.ActualWidth / numCols;
            colWidth -= 15;
            colWidth = Math.Max(1, colWidth);
            this.gridViewServers.SetValue(GridViewItemWidthProperty, colWidth);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void gridViewServers_Loaded(object sender, RoutedEventArgs e)
        {

        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void buttonNewServer_Click(object sender, RoutedEventArgs e)
        {
            Frame rootFrame = Window.Current.Content as Frame;
            rootFrame.Navigate(typeof(SageX3WUP.App.Pages.ConfigServerPage));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void buttonOpenServer_Click(object sender, RoutedEventArgs e)
        {
            Model.Server server = (Model.Server) ((Button ) e.OriginalSource).DataContext;
            Frame rootFrame = Window.Current.Content as Frame;
            rootFrame.Navigate(typeof(SageX3WUP.App.Pages.WebViewPage), server.Id);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void buttonEditServer_Click(object sender, RoutedEventArgs e)
        {
            Model.Server server = (Model.Server)((Button)e.OriginalSource).DataContext;
            if (server != null)
            {
                Frame rootFrame = Window.Current.Content as Frame;
                rootFrame.Navigate(typeof(SageX3WUP.App.Pages.ConfigServerPage), server.Id);
            }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private async void buttonDeleteServer_Click(object sender, RoutedEventArgs e)
        {
            int res = await UIHelpers.ShowModal("Are you sure to delete the current server configuration?", null, new string[] { "Yes", "no" }, 0, 1);
            if (res == 0)
            {
                Model.Server server = (Model.Server)((Button)e.OriginalSource).DataContext;
                Model.Servers.GetKnownServers().DeleteServer(server.Id);
                this.gridViewServers.ItemsSource = null;
                this.gridViewServers.ItemsSource = SageX3WUP.App.Model.Servers.GetKnownServers().List;
            }
        }
    }
}
