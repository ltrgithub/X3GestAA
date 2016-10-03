namespace CommonDialogs.ConnectionProgressDialog
{
    public class ConnectionProgressHelper
    {
        private static ConnectionProgressDialog _connectionProgressDialog = null;

        public static void showConnectionDialog(bool show)
        {
            if (show)
            {
                if (_connectionProgressDialog == null)
                {
                    _connectionProgressDialog = new ConnectionProgressDialog();
                }
                _connectionProgressDialog.Show(); 
            }
            else
            {
                if (_connectionProgressDialog != null)
                {
                    _connectionProgressDialog.Close();
                    _connectionProgressDialog = null;
                }
            }
        }
    }
}
