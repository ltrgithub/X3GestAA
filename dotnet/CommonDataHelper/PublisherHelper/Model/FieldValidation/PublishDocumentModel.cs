﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.FieldValidation
{
    public class PublishDocumentModel
    {
        [JsonProperty("$properties")]
        public DocumentPropertiesModel properties;
    }
}
