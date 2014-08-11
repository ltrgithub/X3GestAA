using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDialogs.ServerSettingsDialog
{
    public interface IServerSettingsDialog
    {
        Uri BaseUrl { get; }
    }
}
