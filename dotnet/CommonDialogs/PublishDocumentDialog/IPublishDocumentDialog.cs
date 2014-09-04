using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace CommonDialogs.PublishDocumentDialog
{
    public delegate void PublisherDocumentDelegate(IPublishDocument publishDocumentParameters, object workingCopyPrototypeModel);

    public interface IPublishDocument
    {
        string Description { get; set; }
        string StorageVolume { get; set; }
        string Owner { get; set; }
        CheckedListBox.CheckedItemCollection Tag { get; }
        CheckedListBox.CheckedItemCollection Team { get; }
    }

    public interface IPublishDocumentDialog : IPublishDocument
    {
        object StorageVolumeList { set; }
        object OwnerList { set; }
        object TagList { set; }
        object TeamList { set; }

        DialogResult ShowDialog();
        void Publisher(PublisherDocumentDelegate publisherDelegate, object workingCopyPrototypeModel);
    }
}
