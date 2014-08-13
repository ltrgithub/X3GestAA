using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDataHelper.PublisherHelper
{
    public interface IDocumentPublisher
    {
        void PublishDocument(ISyracuseOfficeCustomData syracuseCustomData); 
    }
}
