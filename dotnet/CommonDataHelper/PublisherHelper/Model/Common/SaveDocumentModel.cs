using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.Common
{
    public class SaveDocumentModel
    {
        [JsonProperty("$actions")]
        public SaveActionModel actions;

        [JsonProperty("$etag")]
        public int etag;

        [JsonProperty("$uuid")]
        public string uuid;

        [JsonProperty("$url")]
        public string url;
    }
}
