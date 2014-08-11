using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Net;

namespace CommonDialogs.CredentialsDialog
{
    interface ICredentialsDialog
    {
        NetworkCredential Credentials { get; }
        DialogResult ShowDialog();
    }
}
