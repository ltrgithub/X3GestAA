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
using Windows.UI.Popups;
using System.Threading.Tasks;
using Sage.X3.Mobile.App.Model;
using Sage.X3.Mobile.App.Common;

// The Blank Page item template is documented at http://go.microsoft.com/fwlink/?LinkId=234238

namespace Sage.X3.Mobile.App.Pages.ServerConfig
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class ConfigServerPage : Page
    {
        private string currentServerId;

        public ConfigServerPage()
        {
            this.InitializeComponent();
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="e"></param>
        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            if (e.Parameter != null) // Edit config
            {
                string serverId = e.Parameter.ToString();
                if (serverId.Length > 0)
                {
                    this.buttonDelete.Visibility = Visibility.Visible;
                    Model.Server srv = Model.Servers.GetKnownServers().GetServerById(serverId);
                    if (srv != null)
                    {
                        this.currentServerId = serverId;
                        this.textBoxName.Text = srv.Name;
                        this.textBoxDescription.Text = srv.Description;
                        this.textBoxUrl.Text = srv.Url;
                    }
                }
            } else
            {
                this.currentServerId = Guid.NewGuid().ToString();
                this.buttonDelete.Visibility = Visibility.Collapsed;
            }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private async void buttonSave_Click(object sender, RoutedEventArgs e)
        {
            Model.Server srv = new Model.Server(this.currentServerId, this.textBoxName.Text, this.textBoxDescription.Text, this.textBoxUrl.Text, this.checkBoxMakeDefault.IsChecked.HasValue ? (bool) this.checkBoxMakeDefault.IsChecked : false);
            bool serverOk = await this.validateServer(srv);
            if (serverOk)
            {
                Model.Servers.GetKnownServers().SaveServer(srv);
                Frame rootFrame = Window.Current.Content as Frame;
                if (rootFrame.CanGoBack)
                {
                    rootFrame.GoBack();
                }
            }
        }


        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void buttonCancel_Click(object sender, RoutedEventArgs e)
        {
            Frame rootFrame = Window.Current.Content as Frame;
            if (rootFrame.CanGoBack)
            {
                rootFrame.GoBack();
            }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private async void buttonDelete_Click(object sender, RoutedEventArgs e)
        {
            int res = await UIHelpers.ShowModal("Are you sure to delete the current server configuration?", null, new string[] { "Yes", "no" }, 0, 1);
            if (res == 0)
            {
                //Model.Servers.GetKnownServers().DeleteServer(this.currentServerId);
                Frame rootFrame = Window.Current.Content as Frame;
                if (rootFrame.CanGoBack)
                {
                    rootFrame.GoBack();
                }
            }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="srv"></param>
        /// <returns></returns>
        private async Task<bool> validateServer(Server srv)
        {
            if (srv.Name.Trim().Length < 1)
            {
                await UIHelpers.ShowModal("To enter a name is mandatory", null, new string[] { "Ok" }, 0, 0);
                return false;
            }

            if (!Model.Server.IsValidUrl(srv.Url))
            {
                await UIHelpers.ShowModal("The URL you entered seems invalid", null, new string[] { "Ok" }, 0, 0);
                return false;
            }
            return true;
        }
    }
}
