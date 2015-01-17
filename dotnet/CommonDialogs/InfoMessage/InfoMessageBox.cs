using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace CommonDialogs
{
    public static class InfoMessageBox
    {
        public static void ShowInfoMessage(string text, string title)
        {
            MessageBox.Show(text, title, MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
    }
}
