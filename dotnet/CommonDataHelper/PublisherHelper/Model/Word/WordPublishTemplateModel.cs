using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;
using CommonDataHelper.PublisherHelper.Model.Common;

namespace CommonDataHelper.PublisherHelper.Model.Word
{
    public class WordPublishTemplateModel
    {
        [JsonProperty("$etag")]
        public int etag;

        [JsonProperty("$uuid")]
        public string uuid;

        [JsonProperty("code")]
        public string code;

        [JsonProperty("description")]
        public string description;

        [JsonProperty("owner")]
        public SyracuseUuidModel owner;

        [JsonProperty("$url")]
        public string url;
    }
}
