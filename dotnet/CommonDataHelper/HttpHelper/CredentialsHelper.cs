using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDialogs;
using CommonDialogs.CredentialsDialog;
using System.Net;

namespace CommonDataHelper
{
    /*
     * Maintain network credentials globally - this may change with Excel, as different credentials may be required where more than one datasource is present in a worksheet.
     */
    public static class CredentialsHelper
    {
        private static NetworkCredential _userCredentials;
        public static NetworkCredential UserCredentials
        {
            get
            {
                if (_userCredentials == null)
                {
                    CredentialsDialog credentialsDialog = new CredentialsDialog();
                    if (credentialsDialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                    {
                        _userCredentials = credentialsDialog.Credentials;
                    }
                    else
                    {
                        /*
                         * We've pressed Cancel, so don't attempt further retries
                         */
                        Retries = 0;
                    }
                }
                return _userCredentials;
            }
            set { _userCredentials = value; }
        }

        private static int _retries = 2;
        public static int Retries
        {
            get { return _retries; }
            set { _retries = value; }
        }

        public static void clear()
        {
            Retries = 0;
            UserCredentials = null;
        }

        public static void resetRetries()
        {
            Retries = 2;
        }

        public static bool isUserLoggedOn()
        {
            return _userCredentials != null;
        }
    }
}
