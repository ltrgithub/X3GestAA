using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace CommonDialogs.PublishDocumentDialog
{
    public delegate void PublisherDelegate ();

    public interface IPublishDocumentDialog
    {
        string Description { get; set; }
        string StorageVolume { get; set; }
        string Owner { get; set; }
        string Tag { get; set; }
        string Team { get; set; }

        List<string> StorageVolumeList { set; }
        List<string> OwnerList { set; }
        List<string> TagList { set; }
        List<string> TeamList { set; }

        DialogResult ShowDialog();
        void Publisher (PublisherDelegate publisherDelegate);
    }
}
