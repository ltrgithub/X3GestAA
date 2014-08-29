using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDialogs.PublishDocumentTemplateDialog;

namespace CommonDataHelper.PublisherHelper
{
    public interface IDocumentTemplatePublisher
    {
        void publishDocument(byte[] documentContent, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocumentTemplate publishDocumentParameters);
    }
}
