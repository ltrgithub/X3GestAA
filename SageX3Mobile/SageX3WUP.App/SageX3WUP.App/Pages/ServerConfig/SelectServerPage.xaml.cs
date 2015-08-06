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

// The Blank Page item template is documented at http://go.microsoft.com/fwlink/?LinkId=234238

namespace SageX3WUP.App.Pages
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class SelectServerPage : Page
    {
        public static readonly DependencyProperty GridViewItemWidthProperty = DependencyProperty.Register("GridViewItemWidth", typeof(double), typeof(GridView), new PropertyMetadata(300, new PropertyChangedCallback(OnGridViewItemWidthChanged)));

        private static void OnGridViewItemWidthChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
        }

        public SelectServerPage()
        {
            this.InitializeComponent();
            this.Loaded += SelectServerPage_Loaded;
        }

        private void SelectServerPage_Loaded(object sender, RoutedEventArgs e)
        {
            this.gridViewServers.ItemsSource = SageX3WUP.App.Model.Servers.GetKnownServers().List;
        }

        private void gridViewServers_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {

        }

        private void gridViewServers_SizeChanged(object sender, SizeChangedEventArgs e)
        {
            int numCols = (int) this.gridViewServers.ActualWidth / 200;
            numCols = Math.Max(1, numCols);

            double colWidth = this.gridViewServers.ActualWidth / numCols;
            colWidth -= 15;
            colWidth = Math.Max(1, colWidth);
            this.gridViewServers.SetValue(GridViewItemWidthProperty, colWidth);
        }

        private void gridViewServers_Loaded(object sender, RoutedEventArgs e)
        {

        }

        private void gridViewServers_ItemClick(object sender, ItemClickEventArgs e)
        {
            Model.Server server = (Model.Server)e.ClickedItem;
            Frame rootFrame = Window.Current.Content as Frame;
            rootFrame.Navigate(typeof(SageX3WUP.App.Pages.WebViewPage), server.Id);
        }
    }
}
