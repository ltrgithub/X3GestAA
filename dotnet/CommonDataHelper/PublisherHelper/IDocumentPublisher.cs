using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDialogs.PublishDocumentDialog;

namespace CommonDataHelper.PublisherHelper
{
    public interface IDocumentPublisher
    {
        void PublishDocument(byte[] base64DocumentContent, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocument publishDocumentParameters); 
    }
}
