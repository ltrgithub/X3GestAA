﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDialogs.PublishDocumentDialog;
using CommonDataHelper.PublisherHelper.Model.Common;

namespace CommonDataHelper.PublisherHelper
{
    public interface IDocumentPublisher
    {
        void publishDocument(byte[] documentContent, WorkingCopyPrototypeModel workingCopyResponseModel, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocument publishDocumentParameters);
    }
}
