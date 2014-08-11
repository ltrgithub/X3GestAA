using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace CommonDialogs.ServerSettingsDialog
{
    public interface IServerSettingsDialog
    {
        string BaseUrl { get; }
        DialogResult ShowDialog();
    }
}
