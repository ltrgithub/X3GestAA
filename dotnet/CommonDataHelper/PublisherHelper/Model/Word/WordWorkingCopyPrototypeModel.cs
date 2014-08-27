using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.Word
{
    public class WordWorkingCopyPrototypeModel
    {
        [JsonProperty("$uuid")]
        public string uuid;

        [JsonProperty("$etag")]
        public int etag;

        [JsonProperty("$url")]
        public string url;

        [JsonProperty("$trackingId")]
        public string trackingId;

        [JsonProperty("$properties")]
        public Dictionary<string, object> properties;
    }
}
