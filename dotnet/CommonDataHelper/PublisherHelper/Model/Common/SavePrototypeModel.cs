﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.Common
{
    public class SavePrototypeModel
    {
        [JsonProperty("$title")]
        public string title;

        [JsonProperty("$type")]
        public string type;

        [JsonProperty("$url")]
        public string url;

        [JsonProperty("$method")]
        public string method;
    }
}
