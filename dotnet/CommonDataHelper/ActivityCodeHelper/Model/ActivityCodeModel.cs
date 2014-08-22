using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.ActivityCodeHelper.Model
{
    public class ActivityCodeModel
    {
        [JsonProperty("description")]
        public String description;

        [JsonProperty("$uuid")]
        public String uuid;
    }
}
