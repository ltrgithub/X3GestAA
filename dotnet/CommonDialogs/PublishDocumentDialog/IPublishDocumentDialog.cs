using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace CommonDialogs.PublishDocumentDialog
{
    public interface IPublishDocumentDialog
    {
        string Description { get; set; }
        string StorageVolume { get; set; }
        string Owner { get; set; }

        List<string> StorageVolumeList { set; }
        List<string> OwnerList { set; }

        DialogResult ShowDialog();
    }
}
