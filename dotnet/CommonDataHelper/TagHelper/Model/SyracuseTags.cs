using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.SyracuseTagHelper.Model
{
    public class SyracuseTags
    {
        [JsonProperty("$url")]
        public String url;

        [JsonProperty("$descriptor")]
        public String descriptor;

        [JsonProperty("$resources")]
        public List<SyracuseTag> tags { get; set; }
    }
}
