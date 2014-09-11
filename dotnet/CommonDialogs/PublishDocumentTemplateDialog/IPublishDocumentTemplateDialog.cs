using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace CommonDialogs.PublishDocumentTemplateDialog
{
    public delegate void PublisherDocumentTemplateDelegate(IPublishDocumentTemplate publishDocumentParameters, object workingCopyPrototypeModel, object customData, byte[] documentContent);
    public delegate void EndpointDelegate(string officeApplication, string savePrototypeName, string uuid, object syracuseCustomData, object publishTemplateDialog);

    public interface IPublishDocumentTemplate
    {
        string Code { get; set; }
        string Description { get; set; }
        string Owner { get; set; }
        string Purpose { get; set; }
        string Endpoint { get; set; }
        string Company { get; set; }
        string Legislation { get; set; }
        string ActivityCode { get; set; }
        CheckedListBox.CheckedItemCollection Tag { get; }
        CheckedListBox.CheckedItemCollection Team { get; }

        void setEndpointDelegate(EndpointDelegate endpointDelegate, string officeApplication, string savePrototypeName);
    }

    public interface IPublishDocumentTemplateDialog : IPublishDocumentTemplate
    {
        object OwnerList { set; }
        object PurposeList { set; }
        object EndpointList { set; }
        object CompanyList { set; }
        object ActivityCodeList { set; }
        object LegislationList { set; }
        object TagList { set; }
        object TeamList { set; }

        DialogResult ShowDialog();
        void Publisher(PublisherDocumentTemplateDelegate publisherDelegate, object workingCopyPrototypeModel, object customData, byte[] documentContent);
    }
}
