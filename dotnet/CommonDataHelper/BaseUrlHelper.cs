using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDialogs.ServerSettingsDialog;

namespace CommonDataHelper
{
    public class BaseUrlHelper
    {
        /*
         * We're maintaining the base URL globally for the moment.
         * This may change with Excel, as different base URLs may be required 
         * where more than one datasource is present in a worksheet.
         */
        private static Uri _baseUrl;
        public static Uri BaseUrl
        {
            get
            {
                if (_baseUrl == null)
                {
                    ServerSettingsDialog serverSettingsDialog = new ServerSettingsDialog();
                    if (serverSettingsDialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                    {
                        _baseUrl = serverSettingsDialog.BaseUrl;
                    }
                }
                return _baseUrl;
            }
            set { _baseUrl = value; }
        }
    }
}
