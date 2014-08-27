using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDialogs.PublishDocumentDialog;

namespace CommonDataHelper.PublisherHelper
{
    public interface IDocumentPublisher
    {
        void publishDocument(byte[] documentContent, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocument publishDocumentParameters);
    }
}
