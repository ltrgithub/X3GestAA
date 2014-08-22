using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;
using CommonDataHelper.PublisherHelper.Model.Common;

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

        [JsonProperty("volume")]
        public SyracuseUuid storageVolume;

        [JsonProperty("owner")]
        public SyracuseUuid owner;

        [JsonProperty("$url")]
        public string url;
    }
}
