using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.Word
{
    public class WordPublishDocumentJson
    {
        [JsonProperty("$etag")]
        public int etag;

        [JsonProperty("$uuid")]
        public string uuid;

        [JsonProperty("description")]
        public string description;

        [JsonProperty("$url")]
        public string url;
    }
}
