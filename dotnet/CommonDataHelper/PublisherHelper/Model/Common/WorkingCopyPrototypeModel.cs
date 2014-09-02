using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.Common
{
    public class WorkingCopyPrototypeModel
    {
        [JsonProperty("$uuid")]
        public string uuid;

        [JsonProperty("$etag")]
        public int etag;

        [JsonProperty("$key")]
        public string key;

        [JsonProperty("$url")]
        public string url;

        [JsonProperty("$trackingId")]
        public string trackingId;

        [JsonProperty("$properties")]
        public Dictionary<string, object> properties;
    }
}
