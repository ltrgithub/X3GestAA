using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.ActivityCodeHelper.Model
{
    public class ActivityCodeModel
    {
        [JsonProperty("LIBACT")]
        public String description;

        [JsonProperty("CODACT")]
        public String codeact;
    }
}
