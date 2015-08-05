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
        public SelectServerPage()
        {
            this.InitializeComponent();
            this.Loaded += SelectServerPage_Loaded;
        }

        private void SelectServerPage_Loaded(object sender, RoutedEventArgs e)
        {
            this.gridView.ItemsSource = SageX3WUP.App.Model.Servers.GetKnownServers().List;
        }
    }
}
